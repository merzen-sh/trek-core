import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trekscripts/ui";

function App() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl items-center justify-center p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>@trekscripts/ui</CardTitle>
          <CardDescription>Components from the linked workspace UI package.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default App;
