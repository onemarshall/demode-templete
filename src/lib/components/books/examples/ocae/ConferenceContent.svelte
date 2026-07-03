<script lang="ts">
	  import { Button } from "$lib/components/ui/button/index.js";
	import type { ConferenceContent } from './conferences.content';
	import type { ConferencePageConfig } from './conferences.config';

	interface Props {
		content: ConferenceContent;
		config: ConferencePageConfig;
	}

	let { content, config }: Props = $props();
</script>

<section class={config.wrapperClass}>
	<h1 class="text-3xl text-uppercase color-contrast-higher">{content.hero.header}</h1>
	<p class={config.paragraphClass}>{content.hero.subheader}</p>

	<div class="flex flex-wrap gap-sm margin-top-md">
		{#each content.hero.callToAction as action (action.text)}
			<Button variant={config.buttonType} href={action.link}>
				{action.text}
			</Button>
		{/each}
	</div>

	<h2 id="upcoming" class={config.sectionTitleClass}>
		Upcoming Conference: {content.conferences.upcomingConference.name}
	</h2>
	<p class={config.paragraphClass}>
		<strong>Dates:</strong>
		{content.conferences.upcomingConference.dates}
	</p>
	<p class={config.paragraphClass}>
		<strong>Location:</strong>
		{content.conferences.upcomingConference.location}
	</p>
	<p class={config.paragraphClass}>
		<strong>Theme:</strong>
		{content.conferences.upcomingConference.theme}
	</p>

	<div class="flex flex-wrap gap-sm margin-top-md">
		{#each content.conferences.upcomingConference.callToAction as action (action.text)}
			<Button variant={config.buttonType} href={action.link}>
				{action.text}
			</Button>
		{/each}
	</div>

	<h2 id="past" class={config.sectionTitleClass}>Past Conferences</h2>
	<ul class="list-disc padding-left-md">
		{#each content.conferences.pastConferences as conference (conference.year)}
			<li>{conference.year}: {conference.name}</li>
		{/each}
	</ul>

	<div class="margin-top-md">
		<Button variant={config.buttonType} href={content.callToAction[0].link}>
			{content.callToAction[0].text}
		</Button>
	</div>
</section>
