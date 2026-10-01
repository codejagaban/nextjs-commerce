'use client'

import { PublishButton } from '@payloadcms/ui'
import type { PublishButtonClientProps } from 'payload'
import React from 'react'

export const ProductPublishButton: React.FC<PublishButtonClientProps> = (props) => (
  <PublishButton {...props} label="Save changes" />
)
