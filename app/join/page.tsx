'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function JoinContent() {
  const searchParams = useSearchParams()
  const referrerCode = searchParams.get('ref')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Join <span className="text-red-500">BLKOUT</span>
          </h1>
          <p className="text-gray-400">
            Community-owned platform for Black queer men in the UK
          </p>
          {referrerCode && (
            <p className="mt-2 text-sm text-teal-400">
              You were invited by a community member
            </p>
          )}
        </div>

        {/* Signup Form */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <SignupForm referrerCode={referrerCode} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By joining, you agree to our{' '}
          <a href="https://blkoutuk.com/privacy" className="text-teal-400 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}

function SignupForm({ referrerCode }: { referrerCode: string | null }) {
  const [email, setEmail] = React.useState('')
  const [firstName, setFirstName] = React.useState('')
  const [subscriptions, setSubscriptions] = React.useState({
    newsletter: true,
    events: false,
    blkouthub: false,
    volunteer: false,
  })
  const [consent, setConsent] = React.useState(false)
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = React.useState<{
    message: string
    referralCode?: string
    shareUrl?: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const response = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          subscriptions,
          consentGiven: consent,
          source: 'join_page',
          sourceUrl: window.location.href,
          referrerCode: referrerCode || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setResult({
          message: data.message,
          referralCode: data.referralCode,
          shareUrl: data.shareUrl,
        })
      } else {
        setStatus('error')
        setResult({ message: data.message })
      }
    } catch {
      setStatus('error')
      setResult({ message: 'Something went wrong. Please try again.' })
    }
  }

  if (status === 'success' && result) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Welcome to BLKOUT!</h2>
          <p className="text-gray-400">{result.message}</p>
        </div>

        {/* Share section */}
        {result.shareUrl && (
          <div className="bg-slate-700/50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-300 mb-3">
              Invite friends to join the community:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.shareUrl}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-gray-300"
              />
              <button
                onClick={() => navigator.clipboard.writeText(result.shareUrl!)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-3 mt-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join the BLKOUT community: ${result.shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 text-sm"
              >
                Share on WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join the BLKOUT community: ${result.shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Share on X
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-300 mb-1">Email *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">First Name (optional)</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="How should we address you?"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-300 mb-2">I want to receive:</label>
        {[
          { key: 'newsletter', label: 'Weekly community newsletter' },
          { key: 'events', label: 'Event notifications' },
          { key: 'blkouthub', label: 'BLKOUTHUB invitation (online community)' },
          { key: 'volunteer', label: 'Volunteer opportunities' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={subscriptions[key as keyof typeof subscriptions]}
              onChange={(e) =>
                setSubscriptions((prev) => ({ ...prev, [key]: e.target.checked }))
              }
              className="w-5 h-5 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
            />
            <span className="text-gray-300 group-hover:text-white">{label}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-slate-600 pt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-slate-500 bg-slate-700 text-red-500 focus:ring-red-500"
          />
          <span className="text-sm text-gray-400">
            I agree to BLKOUT storing my data securely on UK servers. I can access, export, or delete my data anytime. BLKOUT will never sell my data.
          </span>
        </label>
      </div>

      {status === 'error' && result && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {result.message}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        {status === 'loading' ? 'Joining...' : 'Join BLKOUT'}
      </button>
    </form>
  )
}

import React from 'react'

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
