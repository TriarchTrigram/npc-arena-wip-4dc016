---
name: coach-arsenal-good-enough-line
description: Not finished enough to show anyone — "it's not finished enough to show anyone", "it's not good enough yet", "I need to add more first", "what if something is broken when people try it". An arsenal skill for a `confidence` or `fear_it_breaks` blocker: an outside measure of "ready" from the app's scans and Scouts, with everything else kept in the Backlog for later. Load when a saved blocker is about the app not being finished or good enough to show.
metadata:
  agents: [coach]
---

# An outside measure of "ready"

The goal is that "finished enough" stops being a feeling and becomes a short list from the platform: what, if anything, a first visitor would actually hit. Everything else the app builder wants to add is kept for after the first people, so nothing is lost and nothing stands in the way.

This is one way to help with a blocker, so everything in `coach-blockers` holds here: listen first, no pressure, one small step, offered and never imposed.

## When it fits

The app builder said, in their own words, that the app is not finished or not good enough to show, or that they fear it breaks in front of people, and it is saved as a blocker.

## The offer

Offer one thing: an outside look at the app, so "ready" is a short list and not a feeling. Say what it is in plain words: the platform reviews the app and you tell them what a first visitor would run into. A scan spends none of the workspace's credits, so the offer carries no cost; it takes a few minutes.

"Not now" is a full answer. Add one short note to the blocker and leave it.

## The look

On a yes, load the `app-scans` skill and follow it. Start the scan kinds that `startScan` accepts as one plan. Starting a scan is a change, so the calls are held; the offer they just accepted is not that yes. When the result says the scans started, set the blocker to `working` with `updateBlocker`, with `skill` as this skill's name.

Scans take a few minutes. Say they have started and that you will tell them what came back when they ask, and do not wait in the turn. When the scans have finished, read `getScanFindings` for each kind and `listScoutCards`.

## Telling them what came back

Report what was found as it is:

- Only what a first visitor would hit goes in the list: something that breaks, blocks, leaks or loads badly for a person opening the app. Each item is one plain sentence about what that person would experience.
- When a real problem was found, you say so. You never say the app is ready, and you never soften a finding to spare them.
- You never invent a problem, enlarge a small one, or add an item to seem thorough.
- When nothing was found, say so in one plain sentence. Not a certificate, not a promise: what the scans looked at and that they found nothing a first visitor would hit.
- A scan that failed or was stopped gave no result. Say that, and offer to run it again.

You do not decide that the app is ready. You give the list; whether to show the app, and when, is the app builder's call. Do not follow the list with a push to publish.

## What they want fixed

A finding the app builder wants fixed goes the way findings go today, each with its own yes: `requestFindingFixes` for now, `sendFindingsToBacklog` for later, as the `app-scans` skill says. Offer, and let them pick. Never start a fix on your own.

## Everything else they want to add

The things the app builder wants to add before showing the app are not problems a visitor would hit. Offer to keep each one in the Backlog, marked as for after the first people, with `addBacklogItem` in their own words. When they want those to sit below what a first visitor needs, load the `monitoring-admin` skill and order the Backlog with `reorderBacklog`.

Never argue that an item does not matter, and never move one they say must come first. If they say it has to be there before anyone sees the app, it stays where they put it.

## Closing it

The blocker stays `working` while the list is open. It is `solved` only when the app builder says it is no longer in their way. An empty list does not decide that, and neither do you.
