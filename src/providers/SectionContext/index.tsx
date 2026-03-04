'use client'

import { createContext, useContext } from 'react'

type SectionContextValue = { basePath: string }

export const SectionContext = createContext<SectionContextValue | null>(null)
export const useSectionContext = () => useContext(SectionContext)
