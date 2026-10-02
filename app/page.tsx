import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight">
            WhatsApp AI SaaS
          </span>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Knowledge Base</span>
            <span>Conversations</span>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 w-full max-w-6xl mx-auto flex-col items-center justify-center gap-6 py-24 px-6">
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          AI customer support for your WhatsApp Business number
        </h1>
        <p className="max-w-xl text-center text-lg leading-7 text-muted-foreground">
          A multi-tenant platform where organizations upload their knowledge,
          connect their own WhatsApp numbers, and deploy grounded AI
          assistants.
        </p>
        <div className="flex items-center gap-3">
          <Button size="lg">Create an account</Button>
          <Button size="lg" variant="outline">
            Learn more
          </Button>
        </div>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-6 text-xs text-muted-foreground">
          English is the default product language. Multilingual support is
          coming later.
        </div>
      </footer>
    </div>
  );
}
