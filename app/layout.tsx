import './globals.css'
import React from 'react'

export const metadata = {
  title: 'FCBJ DATA',
  description: 'Track and analyze fitness data with innovative design',
  icons: {
    icon: '/beitar-logo.png',
  },
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