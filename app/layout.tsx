import type { Metadata } from "next";
import { AuthContextProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnboardPilot - Instant Developer Onboarding",
  description:
    "Enter any public GitHub repository URL to instantly generate docs, setup guides, and architectural overviews mapped to your local environment.",
  icons: {
    icon: "/logo2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light h-full" suppressHydrationWarning={true}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="bg-background text-on-surface h-full flex flex-col font-body-md antialiased selection:bg-surface-dim overflow-x-hidden" suppressHydrationWarning={true}>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}
