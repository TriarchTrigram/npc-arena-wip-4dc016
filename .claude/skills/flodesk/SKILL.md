---
name: flodesk
description: >
  Use whenever the app builder mentions Flodesk, email marketing, a newsletter or mailing
  list for their app's signups, or asks which email marketing platforms Stencil works with
  (Mailchimp, Klaviyo, beehiiv, MailerLite, …). Flodesk is Stencil's NATIVE
  email-marketing integration: the app builder connects their Flodesk account and picks the
  segments new app user signups are added to — from chat, or on the app's
  Users page. Covers the in-chat connect flow, why it is not done until a segment is saved,
  broken sync, how to answer "which email platforms do you support", and how app code adds
  any other email it collects (a lead form, a purchase) with addToFlodesk; waitlist joins sync
  on their own.
allowed-tools: connectFlodesk
metadata:
  agents: [chat, builder]
---

# Flodesk — the native email-marketing integration

Stencil ships one native email-marketing integration, and it is Flodesk. The app builder
connects their Flodesk account once for the whole workspace, then picks per app which
Flodesk segments new signups are added to. From then on, every new app user signup is
synced to those segments automatically by the platform. There is no code to write, no
webhook to stand up, and no API key to collect.

**Never say Stencil has no native email-marketing connection.** Flodesk is never registered
with `addCustomProvider` and never researched for OAuth endpoints — Stencil already holds
the OAuth client. Treating it as a missing provider is the exact wrong answer this skill
exists to prevent.

## In chat (chat agent only): `connectFlodesk`

When the app builder wants Flodesk — or wants their signups flowing into their email
marketing — call `connectFlodesk`. It puts an interactive card in this conversation:

- **Not connected** — a Connect button that opens the Flodesk sign-in in a popup.
- **Connected, no segments** — the segment picker, with "Nothing syncs until you pick a segment."
- **Syncing** — the picker showing the chosen segments and when it last synced.
- **Broken** — "signups aren't syncing" and a Reconnect button.

`connectFlodesk` stops your turn, and **you do not see its result until the builder next
writes.** So the one line you write before calling it must already carry the warning, for
example: *"Here's Flodesk — connect it and pick at least one segment; nothing syncs until
you do."* Then stop.

A `connectFlodesk` result is a **snapshot** of that moment. Before telling the builder
anything about Flodesk's status in a later turn, call it again.

Do not send the app builder to Settings for this. The card is the flow; the only other
place it lives is the app's **Users page** (More → Users), which you can mention as
where to manage it later.

Connecting needs a workspace owner or admin. The card tells anyone else so — suggest they
ask the workspace owner.

## It is not set up until a segment is saved

Connecting Flodesk syncs nothing on its own: the platform only sends a signup to Flodesk
when this app has at least one segment picked. After the builder connects, the card
switches to the segment picker by itself, and no message comes to you. When their saved
segments arrive as their next message, confirm which segments. If a result says
`needs_segments`, or the builder says they connected but did not pick one, say plainly
that nothing syncs yet and point at the picker. Never say "Flodesk is connected" as if
that were the end.

## When sync is broken

If a result is `needs_reconnect`, or `syncing` with an instruction saying the last sync
failed, say plainly that signups are not reaching Flodesk and that the card's Reconnect
button fixes it. Do not describe it as working.

## Answering "which email marketing platforms do you support"

Name **Flodesk first, as the built-in integration** — connected in one step from this chat,
signups sync automatically. Then **Kit (formerly ConvertKit), built in too** and connected
the same way: load the `mailing-list` skill for it, and never ask for a Kit API key. Then
**ActiveCampaign, built in too**, through the same `mailing-list` skill: its card takes
the API URL and key, so never ask for them in the chat. Then **MailerLite, built in
too**, through the same `mailing-list` skill: its card takes the API token, so never ask
for it in the chat. Then,
if the builder wants a different platform: most other ESPs (Mailchimp, Klaviyo, beehiiv, …)
can be reached from app code through their own APIs with an API key stored in the app's
secrets — a build, not a native connection. Never present that list without Flodesk at the
top.

## What syncs on its own, and what the app adds

**App account signups** through the platform's auth reach Flodesk with no code at all, and so
does every **waitlist join**: the hosted sign-up page of an invite-only app and a landing-page
form that calls `joinWaitlist` from `~stencil/waitlist` both land on the app's one waitlist
(on the Users page) and are synced to the saved segments by the platform. Never write an
`addToFlodesk` call for a waitlist, and never build a waitlist entity to hold the emails. An
app that already has one keeps it: the rows in it are not on the platform list and are not
synced to Flodesk, and a build cannot move them — the `landing-page` skill, rule 5, says what
to do with the entity and what to tell the app builder. A newsletter box, a footer sign-up
or a "get the free guide" box that only collects an email is the same list: use
`<WaitlistForm>` from `~stencil/ui/waitlist/form` (`landing-page` skill, rule 4), which
syncs with no `addToFlodesk` call and no table. Any
other email the app collects — a lead form with its own fields, a quiz, a guest purchase, a plan
change — gets there with one server-side call:

```ts
import { addToFlodesk } from "~stencil/flodesk";

await addToFlodesk(context.cloudflare.env, { email, name });
// or, to also join specific segments on top of the saved ones:
await addToFlodesk(context.cloudflare.env, { email, name, segmentIds: [segmentId] });
```

It adds the person to the segments saved on the Users page through the workspace's
connection, on the same queue and retry as signups. Call it after the write that collected
the email (the form action, the handler for `order.paid` or `subscription.activated` in
`app/events.ts` — see the `events` skill). It never throws and is skipped in local dev;
it resolves `false` when Flodesk is not connected and no segment is named anywhere, so the
form still succeeds either way. `false` never means the address was already subscribed, and
the page shows the same message whatever the call returned — a different reply for a known
address tells any visitor who is on the list. Server side only — never from the browser.

Never ask for a Flodesk API key and never call Flodesk's API from app code: the connection
already covers it, and a hand-wired call skips the queue, so leads vanish when Flodesk
blips.

**A segment per plan needs no code.** The app builder picks a "Flodesk segment" on each
subscription plan in More → Settings → Payments (the field appears once Flodesk is
connected), and the platform adds every app user whose subscription to that plan becomes
active to it, on top of the segments saved on the Users page. "Paid members in their own
segment" or "one segment per plan" is that setting — point the builder at it instead of
writing an `addToFlodesk` call in a `subscription.activated` handler.

**A segment per form field** (a role picked on a waitlist, a course bought) is the
`segmentIds` parameter. It takes Flodesk segment ids, and there is no tool yet that lists
the account's segments with their ids, so build it only when the builder gives you the ids
(keep them as named constants in the handler). Otherwise say plainly that routing by form
field is not available yet, and never ask for an API key to get around it.

Replacing the platform's `createAuth` silently stops the signup sync — see the
`custom-auth` skill.

## In a build (build agent)

You do not have `connectFlodesk`. Never try to call it. If the brief needs Flodesk
connected or segments picked, finish the build and tell the builder to say "connect
Flodesk" in the chat.

The signup→Flodesk sync is platform-side. Do not write Flodesk API calls, do not add a
signup hook that posts to Flodesk, and do not ask for a Flodesk API key — the OAuth
connection already covers it. A brief that says "add new signups to my Flodesk" is done by
connecting and picking segments, which happens in the chat or on the Users page, not in
app code. A brief that says "add my leads / buyers to Flodesk" is one
`addToFlodesk` call where the email is collected, and nothing else. "Add my waitlist to
Flodesk" needs no code at all: waitlist joins (`joinWaitlist`, or the invite-only sign-up page)
already sync to the saved segments. Sign-ups the app stored in an entity of its own are not
synced and a build cannot move them; say so, as `landing-page` rule 5 describes.

The one Flodesk ask that is *not* this feature: an app whose **app users** market to their
own contacts through their own Flodesk accounts. That is a member connection to a provider
the catalog does not have — the `member-connections` skill's custom-provider path — not
this workspace-level integration.
