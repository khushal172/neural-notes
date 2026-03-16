import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that require a logged-in user
const isProtectedRoute = createRouteMatcher(['/notes(.*)', '/api/embed(.*)', '/api/link(.*)', '/api/explain(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
