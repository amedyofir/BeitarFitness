import './globals.css'
import React from 'react'

export const metadata = {
  title: 'Fitness Tracker',
  description: 'Track and analyze fitness data with innovative design',
}

export default function RootLayout({
  children,
}: {
  children: any
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-background"></div>
        {children}
      </body>
    </html>
  )
} 