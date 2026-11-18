---
name: mailing-list
description: >
  Use whenever the app builder names Kit, ConvertKit, ActiveCampaign or MailerLite, or wants their
  app's signups, waitlist, leads or buyers in a mailing list service other than Flodesk.
  Kit (formerly ConvertKit), ActiveCampaign and MailerLite are built-in mailing list services: the app
  builder connects one from chat with `connectMailingList` and picks where new signups go
  (Kit tags; ActiveCampaign lists and tags; MailerLite groups), with no build and no key
  typed into the chat. "Connect ActiveCampaign", "connect MailerLite" and "add my signups
  to MailerLite" are this skill, not a webhook and not custom code. Flodesk itself, and the question of which email marketing platforms Stencil
  supports, belong to the `flodesk` skill.
allowed-tools: connectMailingList
metadata:
  agents: [chat, builder]
---

# Kit — one connection, one call

Kit (formerly ConvertKit) is a built-in mailing list service the app builder connects once
for the whole workspace. They pick per app which Kit tags, plus an optional form, new signups go
to, and the platform sends every new app user signup and every waitlist join there. No
code, no webhook, no API key. Its `service` id is `"kit"`.

**ActiveCampaign is built in the same way**, on the same card, tool and helper. Its
`service` id is `"activecampaign"`. Everything below that is said about Kit holds for it
too; the differences are in [ActiveCampaign](#activecampaign). Never say Stencil does not
support ActiveCampaign, and never route a plain "connect ActiveCampaign" or "add my
signups to ActiveCampaign" to Events, a webhook, Zapier, Make or a build — not even when
the card comes back `unavailable`.

**MailerLite is built in the same way too.** Its `service` id is `"mailerlite"`, and the
differences are in [MailerLite](#mailerlite). Never say Stencil does not support
MailerLite or that it needs the app builder's own key and custom code for plain signups,
and never route "connect MailerLite" or "add my signups to MailerLite" to Events, a
webhook, Zapier, Make or a build — not even when the card comes back `unavailable`.

**Flodesk keeps its own skill, tool and call — load `flodesk` for it and never pass
`"flodesk"` here.** An app can use Flodesk and Kit at the same time; they are independent.

## Answering "which email marketing platforms do you support"

This skill does not answer that question, even in a conversation that is already about
Kit. Load the `flodesk` skill and give its answer as it is written there: Flodesk first,
then Kit, ActiveCampaign and MailerLite as built in too, then other platforms through their own API. Do not add any route
that answer does not name.

## In chat (chat agent only): `connectMailingList`

When the app builder wants Kit, call `connectMailingList({ service: "kit" })`. It puts an
interactive card in this conversation:

- **Not connected** — a Connect button that opens Kit's own sign-in in a popup. Until Kit
  approves Stencil's listing, Kit's page may call Stencil "an unverified app"; that is
  expected, and safe to continue.
- **Connected, nothing picked** — the picker, with "Nothing syncs until you pick where signups go."
- **Syncing** — the picker showing the chosen tags and form, and when it last synced.
- **Broken** — "signups aren't syncing" and a Reconnect button.
- **Not available** — "Kit isn't available for this workspace yet."
- **Could not check** — "Couldn't check Kit's status right now. Try again in a moment."

`connectMailingList` stops your turn, and **you do not see its result until the builder
next writes.** So the one line you write before calling it must already carry the warning,
for example: *"Here's Kit — connect it and pick at least one tag; nothing syncs until you
do."* Then stop.

A result is a **snapshot** of that moment. Before telling the builder anything about the
service's status in a later turn, call the tool again.

Do not send the app builder to Settings for this. The card is the flow; the only other
place it lives is the app's **Users page** (More → Users), which you can mention as where
to manage it later. Connecting needs a workspace owner or admin; the card tells anyone
else so.

### When the result is `unavailable`

The service is not open for this workspace yet. Say that plainly, in one line: Kit is not
available for their workspace yet. Then stop there:

- **Never ask for a Kit API key**, and never brief a build that calls Kit's API by hand.
- Do not promise a date, and do not say it is broken.
- If they want signups in a mailing list today, Flodesk is available — offer it.

An app that already calls Kit with its own key is a hand-made setup that none of this
reaches; leave it as it is.

### When the result is `status_unknown`

Stencil could not check whether the service is open for this workspace just now. Nothing
is known, so do not say Kit is unavailable, connected or broken. Say the check failed on
Stencil's side and to try again in a moment, and call the tool again when they ask.
**Never ask for a Kit API key** here either.

## ActiveCampaign

When the app builder wants ActiveCampaign, call
`connectMailingList({ service: "activecampaign" })` after one line such as *"Here's
ActiveCampaign — connect it and pick at least one list or tag; nothing syncs until you
do."* The card, its states, `unavailable`, `status_unknown` and a broken sync all work as
described for Kit. What differs:

- **No sign-in popup.** The card's Connect button opens a dialog with two fields, **API
  URL** and **API key**. The app builder copies both from ActiveCampaign: Settings, then
  Developer. Tell them where to find the two values if they ask.
- **The key goes only into that dialog. Never ask the app builder to paste the API URL or
  key into the chat**, and never offer a secret box, an app secret or an environment
  variable for it: `requestSecret` has no part in connecting ActiveCampaign. If they paste
  a key anyway, do not use it: call `redactSecret` with the value copied exactly and no
  `saveAs` (it is not an app secret), point them at the card's Connect button, and never
  write the value in your reply. If the redaction itself fails, say the paste could not be
  removed — without repeating it — and tell them to rotate the key on ActiveCampaign's
  Settings, Developer page.
- **They pick lists and tags.** At least one of either. A contact on no list cannot be
  sent campaigns in ActiveCampaign, so suggest a list when they pick tags only. Lists and
  tags are created in ActiveCampaign; the picker shows what the account has.
- Someone who unsubscribed from a list in ActiveCampaign is never put back on it.
- **A tag per plan:** the "ActiveCampaign tag" field on each subscription plan in More →
  Settings → Payments, once ActiveCampaign is connected.
- When it is `unavailable`, say ActiveCampaign is not available for their workspace yet
  and offer Flodesk or Kit. **Nothing stands in for the connection**: not a key or a secret
  box, not a build that calls ActiveCampaign's API, and not Events, a webhook, Zapier or
  Make. That holds for the whole conversation, not just the first reply — a follow-up such
  as *"so can I use it?"* or *"isn't there another way?"* gets the same answer, with
  Flodesk and Kit as the only routes you name.

In app code the one call names the service, and a destination id says what it is:

```ts
await addToMailingList(context.cloudflare.env, { service: "activecampaign", email, name });
// or, to also join a list and add a tag on top of the saved ones:
await addToMailingList(context.cloudflare.env, {
  service: "activecampaign", email, name, destinationIds: ["list:3", "tag:12"],
});
```

ActiveCampaign destination ids are `list:<id>` or `tag:<id>`, because lists and tags are
numbered separately. **A bare id such as `"12"` means a tag.** `name` is the full name:
the first word becomes the first name and the rest the last name.

**Prefer the built-in connection for plain signups.** A new app user going onto a list or
getting a tag is the built-in connection: connect and pick in chat or on the Users page,
plus one `addToMailingList` call for any other email the app collects. Do not write
custom ActiveCampaign code for that, and do not ask for a key for it. Custom code, with
the app builder's key saved through the secret box (never typed into chat), stays right
only for what the built-in connection does not do: custom fields, automations, deals.

## MailerLite

When the app builder wants MailerLite, call `connectMailingList({ service: "mailerlite" })`
after one line such as *"Here's MailerLite — connect it and pick at least one group;
nothing syncs until you do."* That line never says MailerLite is connected and never
promises a field: you do not know the result yet. The card, its states, `unavailable`,
`status_unknown` and a broken sync all work as described for Kit. What differs:

- **No sign-in popup.** The card's Connect button opens a dialog with one field, the
  **API token**. There is no API URL. The app builder generates the token in MailerLite:
  Integrations, then MailerLite API. MailerLite shows it once, so they copy it then. A
  key from MailerLite Classic does not work.
- **The token goes only into that dialog. Never ask the app builder to paste it into the
  chat**, and never offer a secret box, an app secret or an environment variable for it:
  `requestSecret` has no part in connecting MailerLite. If they paste a token anyway, do
  not use it: call `redactSecret` with the value copied exactly and no `saveAs` (it is not
  an app secret), point them at the card's Connect button, and never write the value in
  your reply. If the redaction itself fails, say the paste could not be removed — without
  repeating it — and tell them to delete that token in MailerLite and generate a new one.
- **They pick groups.** At least one. Groups are created in MailerLite; the picker shows
  what the account has.
- Someone who unsubscribed in MailerLite is never put back, and that is not an error:
  do not report it as a failed sync.
- **Double opt-in follows the MailerLite account's own setting.** Stencil does not turn it
  on or off.
- **A group per plan:** the "MailerLite group" field on each subscription plan in More →
  Settings → Payments, once MailerLite is connected.
- When it is `unavailable`, say MailerLite is not available for their workspace yet and
  offer Flodesk, Kit or ActiveCampaign. **Nothing stands in for the connection**: not a
  key or a secret box, not a build that calls MailerLite's API, and not Events, a webhook,
  Zapier or Make. That holds for the whole conversation, not just the first reply — a
  follow-up such as *"so can I use it?"* or *"isn't there another way?"* gets the same
  answer, with the other built-in services as the only routes you name.

In app code the one call names the service:

```ts
await addToMailingList(context.cloudflare.env, { service: "mailerlite", email, name });
// or, to also join a group on top of the saved ones:
await addToMailingList(context.cloudflare.env, {
  service: "mailerlite", email, name, destinationIds: ["184726350912345678"],
});
```

A MailerLite destination id is the group id **as a string, never a number**: the ids are
longer than a JavaScript number holds, so a numeric literal silently becomes a different
group. `name` is the full name: the first word becomes the first name and the rest the
last name.

**Prefer the built-in connection for plain signups.** A new app user joining a group is
the built-in connection: connect and pick in chat or on the Users page, plus one
`addToMailingList` call for any other email the app collects. Do not write custom
MailerLite code for that, and do not ask for a key for it. Custom code, with the app
builder's key saved through the secret box (never typed into chat), stays right only for
what the built-in connection does not do: custom fields, automations. An app that already
calls MailerLite from its own code keeps working; leave it as it is unless the app
builder asks to move it.

## It is not set up until something is picked

Connecting syncs nothing on its own: the platform only sends a signup once this app has at
least one destination saved. For Kit that means **at least one tag**; for ActiveCampaign,
at least one list or tag; for MailerLite, at least one group. A **form** is
optional and at most one: adding it runs that form's confirmation email, which is how the
builder keeps double opt-in. Tags and forms are created in Kit, not here; the picker lists
what the account already has.

After the builder connects, the card switches to the picker by itself and no message comes
to you. When their saved choice arrives as their next message, confirm it. If a result
says `needs_destinations`, say plainly that nothing syncs yet and point at the picker.
Never say "Kit is connected" as if that were the end.

## When sync is broken

If a result is `needs_reconnect`, or `syncing` with an instruction saying the last sync
failed, say plainly that signups are not reaching the service and that the card's
Reconnect button fixes it. Sign-ups that arrive while the connection is refused are
**held**, not lost: after reconnecting, the card on the Users page asks whether to send
them or skip them. That choice is the app builder's.

## What syncs on its own, and what the app adds

**App account signups** through the platform's auth and every **waitlist join** (the hosted
sign-up page of an invite-only app, or `joinWaitlist` from `~stencil/waitlist`) reach the
saved destinations with no code. Never write a call for those. A newsletter box or footer
sign-up that only collects an email is a waitlist join too: use `<WaitlistForm>` from
`~stencil/ui/waitlist/form` (`landing-page` skill, rule 4). Any other email the app
collects — a lead form with its own fields, a quiz, a guest purchase — gets there with one
server-side call that names the service:

```ts
import { addToMailingList } from "~stencil/mailing-list";

await addToMailingList(context.cloudflare.env, { service: "kit", email, name });
// or, to also add specific Kit tags on top of the saved ones:
await addToMailingList(context.cloudflare.env, { service: "kit", email, name, destinationIds: [tagId] });
```

It adds the person to the destinations saved on the Users page through the workspace's
connection, on the same queue and retry as signups. Call it after the write that collected
the email (the form action, or the handler for `order.paid` in `app/events.ts` — see the
`events` skill). It never throws and is skipped in local dev; it resolves `false` when the
service is not set up for this app, so the form still succeeds either way. `false` never
means the address was already subscribed, and the page shows the same message whatever the
call returned — a different reply for a known address tells any visitor who is on the
list. Server side only — never from the browser.

- `name` is the full name. Kit keeps a first name only, and the platform sends the first word.
- `destinationIds` are ids on the service — for Kit, **tag ids**, up to 20. There is no
  tool yet that lists the account's tags with their ids, so use them only when the builder
  gives you the ids (keep them as named constants). Otherwise say plainly that routing by
  form field is not available yet.
- An app on both Flodesk and Kit makes both calls, `addToFlodesk` first.

**A Kit tag per plan needs no code.** The app builder picks a "Kit tag" on each
subscription plan in More → Settings → Payments (the field appears once
Kit is connected), and the platform tags every app user whose subscription to that plan
becomes active, on top of the tags saved on the Users page. Point the builder at that
setting instead of writing a call in a `subscription.activated` handler.

Replacing the platform's `createAuth` silently stops the signup sync — see the
`custom-auth` skill.

## In a build (build agent)

You do not have `connectMailingList`. Never try to call it. If the brief needs Kit
connected or tags picked, finish the build and tell the builder to say "connect Kit" in
the chat.

All of this holds for ActiveCampaign too, with `service: "activecampaign"` and "connect
ActiveCampaign" as what the builder says in the chat. Prefer the built-in connection for
plain signups, as the [ActiveCampaign](#activecampaign) section says: no ActiveCampaign
API call and no key for adding a signup, lead or buyer to a list or tag.

The same holds for MailerLite, with `service: "mailerlite"` and "connect MailerLite" as
what the builder says in the chat: no MailerLite API call and no key for adding a signup,
lead or buyer to a group, as the [MailerLite](#mailerlite) section says. Code in the app
that already calls MailerLite with its own key stays as it is unless the brief asks to
change it.

The signup sync is platform-side. Do not write Kit API calls, do not add a signup hook
that posts to Kit, and do not ask for a Kit API key. A brief that says "add new signups to
my Kit" is done by connecting and picking tags, in the chat or on the Users page, not in
app code. A brief that says "add my leads / buyers to Kit" is one `addToMailingList` call
where the email is collected, and nothing else; it resolves `false` until Kit is connected
and a tag is saved, so say in your summary that the builder must do that for it to take
effect. "Add my waitlist to Kit" needs no code at all.
