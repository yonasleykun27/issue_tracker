'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { FaSignOutAlt } from 'react-icons/fa'

export default function PendingSignOutButton() {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
      className="mt-6 border-zinc-250 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 flex items-center gap-2 cursor-pointer font-bold text-xs py-2 px-4 rounded-xl"
    >
      <FaSignOutAlt size={12} />
      <span>Sign Out / Switch Account</span>
    </Button>
  )
}
