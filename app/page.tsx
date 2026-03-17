import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Hello world!</h1>
      <p className="text-base">Description</p>
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg shadow-lg p-6 max-w-md w-full">
          <p className="text-xl md:text-3xl lg:text-5xl">Some text</p>
          <Button variant="default">
            Button!
          </Button>
        </div>
      </div>
    </div>
  )
}