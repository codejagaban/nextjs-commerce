import { createHash, randomUUID } from 'node:crypto'
import { commitTransaction, initTransaction, killTransaction, type PayloadHandler } from 'payload'
import { isAdmin } from '@/access/isAdmin'
import { applyWorkflowCommand, parseWorkflowCommand, WorkflowError } from './fulfillment'

export const orderWorkflowHandler: PayloadHandler = async (req) => {
  if (!(await isAdmin({ req })))
    return Response.json({ message: 'Administrator access is required.' }, { status: 403 })
  const id = Number(req.routeParams?.id)
  if (!Number.isSafeInteger(id) || id <= 0)
    return Response.json({ message: 'Invalid order.' }, { status: 400 })
  let ownsTransaction = false
  try {
    let input: unknown
    try {
      input = req.data ?? (await req.json?.())
    } catch {
      throw new WorkflowError('Invalid request body.')
    }
    const command = parseWorkflowCommand(input)
    const hash = createHash('sha256').update(JSON.stringify(command)).digest('hex')
    ownsTransaction = await initTransaction(req)
    if (!ownsTransaction) throw new Error('Order workflow requires its own database transaction.')
    let order = await req.payload.findByID({
      collection: 'orders',
      id,
      req,
      depth: 0,
      disableErrors: true,
    })
    if (!order) throw new WorkflowError('Order not found.', 404)
    const replay = order.workflowEvents?.find((event) => event.requestID === command.requestID)
    if (replay) {
      if (replay.requestHash !== hash)
        throw new WorkflowError('Request ID was already used for another action.', 409)
      await commitTransaction(req)
      ownsTransaction = false
      return Response.json({ order, replayed: true })
    }
    const claimed = await req.payload.db.updateOne({
      collection: 'orders',
      req,
      options: { atomic: true },
      where: { and: [{ id: { equals: id } }, { workflowVersion: { equals: command.version } }] },
      data: { workflowVersion: { $inc: 1 } },
    })
    if (!claimed)
      throw new WorkflowError('This order changed. Refresh it before trying again.', 409)
    order = await req.payload.findByID({ collection: 'orders', id, req, depth: 0 })
    const now = new Date().toISOString()
    const changes = applyWorkflowCommand(order, command, now, randomUUID())
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
            action: command.action,
            actor: req.user!.id,
            occurredAt: now,
            requestID: command.requestID,
            requestHash: hash,
          },
        ],
      },
    })
    await commitTransaction(req)
    ownsTransaction = false
    return Response.json({ order })
  } catch (error) {
    if (ownsTransaction) await killTransaction(req)
    if (error instanceof WorkflowError)
      return Response.json({ message: error.message }, { status: error.status })
    req.payload.logger.error({ err: error, msg: 'Order workflow failed.' })
    return Response.json(
      { message: 'The order could not be updated. Refresh and try again.' },
      { status: 500 },
    )
  }
}
