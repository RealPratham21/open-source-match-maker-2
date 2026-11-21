import { SignInForm } from '@/components/signin-form'

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return (
    <div className="min-h-screen bg-background">
      <SignInForm errorCode={params.error} />
    </div>
  )
}
