import "./globals.css";

export const metadata = {
  title: "Historical Retirement Lab",
  description: "Rolling-cohort retirement portfolio backtests"
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
