import { RedirectType, redirect } from 'next/navigation'

export default function Home() {
  // Use permanent redirect (308) to avoid 404 issues
  redirect('/dashboard', RedirectType.replace)
}
