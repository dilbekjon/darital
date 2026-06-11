'use client'

// The password-setup flow is gone — tenants sign in with an SMS code.
// Old SMS setup links land here, so keep the route as a redirect.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return null
}
