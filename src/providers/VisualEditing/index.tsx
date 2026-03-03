'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getClientSideURL } from '@/utilities/getURL'

type VisualEditingContextValue = {
  isAdmin: boolean
  docId: string
  collectionSlug: string
  adminBaseUrl: string
}

export const VisualEditingContext = createContext<VisualEditingContextValue | null>(null)

export const useVisualEditing = () => useContext(VisualEditingContext)

type Props = {
  docId: string
  collectionSlug: string
  children: React.ReactNode
}

export const VisualEditingProvider: React.FC<Props> = ({ docId, collectionSlug, children }) => {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch(`${getClientSideURL()}/api/users/me`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) setIsAdmin(true)
      })
      .catch(() => {})
  }, [])

  return (
    <VisualEditingContext.Provider
      value={{
        isAdmin,
        docId,
        collectionSlug,
        adminBaseUrl: `${getClientSideURL()}/admin`,
      }}
    >
      {children}
    </VisualEditingContext.Provider>
  )
}
