'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React from 'react'

import './index.scss'

const readableDate = (value: unknown) => {
  if (typeof value !== 'string') return 'Not published yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not published yet'
  return date.toLocaleString('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const ProductPublishing: React.FC = () => {
  const status = useFormFields(([fields]) => fields._status?.value)
  const { data } = useDocumentInfo()
  const published = status === 'published'

  return (
    <section className="product-publishing" aria-label="Publishing">
      <h3>Publishing</h3>
      <dl>
        <div>
          <dt>Status</dt>
          <dd><span className={published ? 'is-live' : 'is-draft'} />{published ? 'Published' : 'Draft'}</dd>
        </div>
        <div>
          <dt>Visibility</dt>
          <dd>{published ? 'Visible' : 'Hidden'}</dd>
        </div>
        <div>
          <dt>Published at</dt>
          <dd>{readableDate(data?.createdAt)}</dd>
        </div>
        <div>
          <dt>Updated at</dt>
          <dd>{readableDate(data?.updatedAt)}</dd>
        </div>
      </dl>
    </section>
  )
}
