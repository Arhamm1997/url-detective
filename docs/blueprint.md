# **App Name**: URL Detective

## Core Features:

- URL Input Processing: Accept and process multiple URLs entered by the user to identify new and duplicate URLs.
- Real-time Statistics: Display real-time statistics such as total URLs entered, unique URL count, and duplicate URL count.
- Visual Identification: Visually indicate new vs. duplicate URLs using color-coding.
- Duplicate Count: Show duplicate counts next to each repeated URL, updating in real time.
- Data Export: Enable exporting the processed URL data as CSV or JSON files.
- Search and Filter: Implement a search/filter feature to easily find URLs within the results.
- Intelligent Flagging: An LLM tool for intelligently flagging potentially malicious URLs for review using external threat intelligence feeds.

## Style Guidelines:

- Primary color: Deep blue (#2E3192) for a professional and modern feel.
- Background color: Very light gray (#F4F5F7), near white, for a clean interface.
- Accent color: Purple (#6639A6) for interactive elements and highlights, offering good contrast against the primary blue.
- Headline font: 'Space Grotesk' (sans-serif) for headings. Body font: 'Inter' (sans-serif) for the body. Note: currently only Google Fonts are supported.
- Use 'Lucide React' icons for a consistent and modern look.
- Modern, clean layout using 'shadcn/ui' components and 'Tailwind CSS' for styling.
- Smooth fade-in animations for results using 'Framer Motion'.