import { createHash, randomUUID } from 'node:crypto'
import { commitTransaction, initTransaction, killTransaction, type PayloadHandler } from 'payload'
import { isAdmin } from '@/access/isAdmin'
import { inventoryTargetsFor } from '@/inventory/restockOrder'
import { WorkflowError } from './fulfillment'
import { applyReturn, parseReturnCommand } from './returns'

export const orderReturnHandler: PayloadHandler = async (req) => {
  if (!(await isAdmin({ req })))
    return Response.json({ message: 'Administrator access is required.' }, { status: 403 })
  const id = Number(req.routeParams?.id)
  if (!Number.isSafeInteger(id) || id <= 0)
    return Response.json({ message: 'Invalid order.' }, { status: 400 })
  let owns = false
  try {
    const command = parseReturnCommand(req.data ?? (await req.json?.()))
    const hash = createHash('sha256').update(JSON.stringify(command)).digest('hex')
    owns = await initTransaction(req)
    if (!owns) throw new Error('Return requires its own transaction.')
    let order = await req.payload.findByID({ collection: 'orders', id, req, depth: 0 })
    const replay = order.workflowEvents?.find((event) => event.requestID === command.requestID)
    if (replay) {
      if (replay.requestHash !== hash)
        throw new WorkflowError('Request ID already used for a different action.', 409)
      await commitTransaction(req)
      owns = false
      return Response.json({ order, replayed: true })
    }
    const claim = await req.payload.db.updateOne({
      collection: 'orders',
      req,
      options: { atomic: true },
      where: { and: [{ id: { equals: id } }, { workflowVersion: { equals: command.version } }] },
      data: { workflowVersion: { $inc: 1 } },
    })
    if (!claim) throw new WorkflowError('This order changed. Refresh before trying again.', 409)
    order = await req.payload.findByID({ collection: 'orders', id, req, depth: 0 })
    const now = new Date().toISOString()
    const { restock, ...changes } = applyReturn(order, command, now, randomUUID())
    const items = restock.map((line) => ({
      ...order.items!.find((item) => item.id === line.orderItemID)!,
      quantity: line.quantity,
    }))
    const targets = inventoryTargetsFor(items)
    if (items.length && !targets.length)
      throw new WorkflowError('Returned product is unavailable for restocking.', 409)
    for (const target of targets) {
      const updated = await req.payload.db.updateOne({
        collection: target.collection,
        id: target.id,
        req,
        data: { inventory: { $inc: target.quantity } },
      })
      if (!updated) throw new WorkflowError('Returned product is unavailable for restocking.', 409)
    }
    order = await req.payload.update({
      collection: 'orders',
      id,
      req,
      depth: 0,
      context: { orderWorkflow: true },
      data: {
        ...changes,
        workflowEvents: [
          ...(order.workflowEvents ?? []),
          {
            action: `return_${command.action}`,
            actor: req.user!.id,
            occurredAt: now,
            requestID: command.requestID,
            requestHash: hash,
          },
        ],
      },
    })
    await commitTransaction(req)
    owns = false
    return Response.json({ order })
  } catch (error) {
    if (owns) await killTransaction(req)
    if (error instanceof WorkflowError)
      return Response.json({ message: error.message }, { status: error.status })
    req.payload.logger.error({ err: error, msg: 'Return workflow failed.' })
    return Response.json(
      { message: 'The return could not be saved. Refresh before retrying.' },
      { status: 500 },
    )
  }
}
