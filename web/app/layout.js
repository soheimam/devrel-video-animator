import './globals.css';

export const metadata = { title: 'Base video edit', description: 'Drop a recording. Get it back edited.' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
