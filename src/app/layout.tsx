// The <html> and <body> tags live in src/app/[locale]/layout.tsx so that the
// lang and dir attributes can depend on the active locale. This root layout
// exists only because Next.js requires one.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
