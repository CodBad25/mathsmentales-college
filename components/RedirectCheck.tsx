'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Composant client qui vérifie si un redirect post-login est en attente
 * dans sessionStorage (ex: retour vers un exercice partagé après connexion).
 */
export default function RedirectCheck() {
  const router = useRouter()

  useEffect(() => {
    const redirect = sessionStorage.getItem('mathsmentales_redirect')
    if (redirect) {
      sessionStorage.removeItem('mathsmentales_redirect')
      router.replace(redirect)
    }
  }, [router])

  return null
}
