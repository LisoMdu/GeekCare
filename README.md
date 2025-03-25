# GeekCare

GeekCare is a telemedicine platform that connects patients with healthcare providers for remote consultations.

## Features

- **User Authentication**: Separate login flows for members (patients) and physicians
- **Scheduling**: Calendar-based scheduling system for physicians
- **Appointments**: Manage and attend virtual appointments
- **Messaging**: Real-time chat between patients and healthcare providers
- **Voice Messages**: Support for voice messaging and offline message queuing
- **Support**: Submit support tickets with file attachments

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Supabase (Auth, Database, Storage, Real-time subscriptions)
- **Styling**: TailwindCSS
- **Routing**: React Router

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Environment Setup

Create a `.env` file with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Migrations

SQL migrations are located in the `supabase/migrations` directory and need to be applied to your Supabase project.

## License

[MIT](LICENSE)