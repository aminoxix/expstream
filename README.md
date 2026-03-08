# expstream

real-time chat app built on stream.io. channels, DMs, threads, polls, rich text, file sharing, voice recordings — the whole deal.

## what it does

- **channels & DMs** - group conversations and direct messages with paginated lists
- **rich text editor** - lexical-powered input with formatting toolbar
- **media attachments** - images, videos, audio, PDFs, docs — upload to S3, served via presigned URLs
- **voice recording** - record and send audio messages inline
- **threads** - reply to any message in a threaded view
- **polls** - create polls with multiple options right in chat
- **pinned messages** - pin important messages to the top of any channel
- **search** - find channels and users with debounced search + keyboard nav
- **responsive layout** - resizable panels on desktop, sheet-based nav on mobile

## tech

`next.js 15` · `typescript` · `stream-chat-react` · `lexical` · `tailwind css` · `shadcn/ui` · `aws s3`

## run it

```bash
pnpm install
pnpm dev
```

open [localhost:3000](http://localhost:3000) and create your profile.

## env

create `.env.local`:

```env
STREAM_API_KEY=
STREAM_SECRET=
NEXT_PUBLIC_STREAM_API_KEY=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_REGION=
AWS_S3_BUCKET=
```

## project structure

```
src/
├── app/
│   ├── page.tsx                    # main chat dashboard
│   ├── create/page.tsx             # user profile creation
│   └── api/
│       ├── upload/route.ts         # S3 presigned upload
│       └── files/[...key]/route.ts # S3 presigned read (302 redirect)
├── components/
│   ├── chat.tsx                    # chat root with layout
│   ├── custom-input.tsx            # message input + attachments + voice
│   ├── message.tsx                 # custom message rendering
│   ├── responsive-chat-layout.tsx  # resizable desktop / mobile sheet
│   ├── sheet.tsx                   # communication sheet overlay
│   ├── editor/                     # lexical rich text editor
│   ├── sidebar/                    # channel list, search, previews
│   ├── admin/                      # channel create/edit panels
│   ├── poll/                       # poll creation dialog
│   └── ui/                         # shadcn base components
├── hooks/                          # stream chat + utility hooks
├── context/                        # workspace controller
├── config/                         # channel config + constants
├── types/                          # typescript types
├── utils/                          # server actions, helpers, error handling
└── lib/                            # utils, lexical barrel export
```

## license

> developed & maintained by aminos.
