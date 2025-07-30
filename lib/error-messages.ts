export const ErrorMessages = {
  401: {
    title: "Authentication Required",
    message: "Please check your configuration and try again.",
    action: "Check configuration",
    actionUrl: "/docs"
  },
  402: {
    title: "Service Unavailable", 
    message: "Crawlplexity services are temporarily unavailable.",
    action: "Check service status",
    actionUrl: "/docs"
  },
  429: {
    title: "Rate Limit Reached",
    message: "Too many requests. Please wait a moment before trying again.",
    action: "Learn about usage",
    actionUrl: "/docs"
  },
  500: {
    title: "Something went wrong",
    message: "We encountered an unexpected error. Please try again.",
    action: "Check logs",
    actionUrl: "/docs"
  },
  504: {
    title: "Request Timeout",
    message: "This request is taking longer than expected. Try with fewer pages or simpler content.",
    action: "Optimize your request",
    actionUrl: "/docs"
  }
} as const

export function getErrorMessage(statusCode: number): typeof ErrorMessages[keyof typeof ErrorMessages] {
  return ErrorMessages[statusCode as keyof typeof ErrorMessages] || ErrorMessages[500]
}