'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Network, ShieldCheck } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'URL Detective', icon: ShieldCheck },
    { href: '/status-checker', label: 'Status Checker', icon: Network },
  ];
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-headline text-xl font-bold text-primary">
            URL Tools
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
