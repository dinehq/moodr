# Moodr

**Moodboard meets Tinder** — A fun way to collect design feedback from clients and stakeholders.

> 🌅 **Note:** Moodr has been sunsetted and is now open source. Read the original announcement: [Moodr is an experiment by Dine](https://www.dinehq.com/news/moodr/)

![Moodr Screenshot](public/og.png)

## About

Moodr started as an internal joke at [Dine](https://dinehq.com) and became a real tool. We imagined a platform where clients could browse moodboards and give feedback, just like they do on dating apps — swipe right to like, swipe left to pass.

### Features

- 📤 **Upload designs** — Drag and drop images to create a project
- 🔗 **Share with anyone** — No sign-up required for voters
- 👆 **Swipe to vote** — Intuitive Tinder-like voting experience
- 📊 **Real-time insights** — See results as votes come in
- 🎨 **Perfect for** — Brand identity, UI designs, color palettes, and more

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) with App Router
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Authentication:** [Clerk](https://clerk.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Prisma](https://www.prisma.io/) (Neon recommended)
- **Storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Deployment:** [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (we recommend [Neon](https://neon.tech))
- Clerk account for authentication
- Vercel account for blob storage

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/dinehq/moodr.git
   cd moodr
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials in `.env.local`:

   - `POSTGRES_PRISMA_URL` — Your PostgreSQL connection URL (pooled)
   - `POSTGRES_URL_NON_POOLING` — Your PostgreSQL connection URL (direct)
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage token
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
   - `CLERK_SECRET_KEY` — Clerk secret key
   - `CLERK_WEBHOOK_SECRET` — Clerk webhook secret

4. **Set up the database**

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. **Run the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

### Setting up Clerk Webhooks

Moodr uses Clerk webhooks to sync user data. Set up a webhook in your Clerk dashboard:

1. Go to **Webhooks** in Clerk Dashboard
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret to `CLERK_WEBHOOK_SECRET`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm fix` | Format code with Prettier |
| `pnpm analyze-db` | Analyze database size and usage |
| `pnpm kill-orphans` | Clean up orphaned blob storage files |
| `pnpm reset-db` | ⚠️ Reset entire database (destructive) |

## Deployment

The easiest way to deploy Moodr is with [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dinehq/moodr)

Make sure to:
1. Set up all environment variables in Vercel
2. Connect your PostgreSQL database
3. Create a Vercel Blob store
4. Configure Clerk webhooks for your production URL

## Project Structure

```
moodr/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── projects/          # Project pages
│   └── ...
├── components/            # React components
├── lib/                   # Utilities and helpers
├── prisma/               # Database schema
├── public/               # Static assets
└── scripts/              # Utility scripts
```

## User Roles

Moodr has a simple role system:

| Role | Projects | Images per Project |
|------|----------|-------------------|
| Free | 3 | 10 |
| Pro | Unlimited | Unlimited |
| Admin | Unlimited | Unlimited |

Roles are managed via Clerk's `privateMetadata`.

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Credits

Built with ❤️ by [Dine Creative](https://www.dinehq.com) — A design studio based in Beijing with more than ten years of experience, creating brand identities and digital experiences that connect and inspire.

---

*Moodr was an experiment. Thanks to everyone who tried it out!*
