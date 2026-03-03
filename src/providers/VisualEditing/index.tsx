'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
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
    const controller = new AbortController()
    fetch(`${getClientSideURL()}/api/users/me`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) setIsAdmin(true)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const adminBaseUrl = useMemo(() => `${getClientSideURL()}/admin`, [])
  const value = useMemo(
    () => ({ isAdmin, docId, collectionSlug, adminBaseUrl }),
    [isAdmin, docId, collectionSlug, adminBaseUrl],
  )

  return (
    <VisualEditingContext.Provider value={value}>
      {children}
    </VisualEditingContext.Provider>
  )
}
