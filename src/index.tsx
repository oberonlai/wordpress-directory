import { useState } from "react";
import { useAI, useFetch, } from "@raycast/utils";
import { ActionPanel, Action, List, Icon, environment, AI, Detail } from "@raycast/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch(`https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[search]=${searchText}`, {
    execute: searchText.length > 0,
	parseResponse: parseFetchResponse,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search WordPress plugins..."
      throttle
    >
      {searchText.length > 0 ? (
        <List.Section title="Results" subtitle={data?.length + ""}>
           {data?.map((searchResult: SearchResult) => (
             <SearchListItem key={searchResult.name} searchResult={searchResult} />
           ))}
        </List.Section>
      ) : (
        <List.Section>
          {defaultLinks().map((searchResult: SearchResult) => (
            <SearchListItem key={searchResult.name} searchResult={searchResult} />
          ))}
        </List.Section>
      )}
    </List>
  );

}

async function parseFetchResponse(response) {
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  const plugins = responseData.plugins || [];
  const parsedData = plugins.map((plugin) => ({
    name: plugin.name.replace(/&#8211;/g, "-"),
    description: plugin.short_description,
	url: `https://wordpress.org/plugins/${plugin.slug}/`,
  } as SearchResult));
  return parsedData;
}

function defaultLinks() {
  return [
    {
      name: "Plugins Directory",
      description: "Looking for plugins for the WordPress?",
      url: "https://wordpress.org/plugins/",
    } as SearchResult,
    {
      name: "Themes Directory",
      description: "Looking for themes for the WordPress?",
      url: "https://wordpress.org/themes/",
    } as SearchResult,
	{
		name: "Patterns Directory",
		description: "Looking for patterns for the WordPress?",
		url: "https://wordpress.org/patterns/",
	  } as SearchResult,
    //{
    //  name: "Coding Standards",
    //  description: "Looking to ensure your code meets the standards?",
    //  url: "https://developer.wordpress.org/coding-standards/",
    //} as SearchResult,
    //{
    //  name: "Common APIs",
    //  description: "Interested in interacting with various APIs?",
    //  url: "https://developer.wordpress.org/apis/",
    //} as SearchResult,
    //{
    //  name: "REST API",
    //  description: "Getting started on making WordPress applications?",
    //  url: "https://developer.wordpress.org/rest-api/",
    //} as SearchResult,
    //{
    //  name: "WP CLI",
    //  description: "Want to accelerate your workflow managing WordPress?",
    //  url: "https://developer.wordpress.org/cli/commands/",
    //} as SearchResult,
    //{
    //  name: "Plugin Handbook",
    //  description: "Ready to dive deep into the world of plugin authoring?",
    //  url: "https://developer.wordpress.org/cli/commands/",
    //} as SearchResult,
    //{
    //  name: "Theme Handbook",
    //  description: "Want to learn how to start theming WordPress?",
    //  url: "https://developer.wordpress.org/cli/commands/",
    //} as SearchResult,
  ];
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult?.name}
      subtitle={searchResult?.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <DefaultActions searchResult={searchResult} />
            {environment.canAccess(AI) && (
              <Action.Push
                title="View Summary"
                icon={Icon.Paragraph}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                target={<Summary searchResult={searchResult} />}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function DefaultActions({ searchResult }: { searchResult: SearchResult }) {
  return (
    <>
      <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
      <Action.CopyToClipboard title="Copy URL to Clipboard" content={searchResult.url} />
    </>
  );
}

function Summary({ searchResult }: { searchResult: SearchResult }) {
  const item = JSON.stringify(searchResult);
  const prompt = `Summarize the following from the WordPress documentation and give one example of usage in a code block. Add the language to the code block like \`\`\`php. The context can only be about WordPress. Format the response as if you are providing documentation:\n${item}`;
  const { data, isLoading } = useAI(prompt, { creativity: 0 });
  const code = data.match(/```[\w\S]*\n([\s\S]*?)\n```/);

  return (
    <Detail
      navigationTitle="AI Generated Summary"
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Continue in Chat"
              icon={Icon.SpeechBubble}
              url={`raycast://extensions/raycast/raycast-ai/ai-chat?fallbackText=${encodeURIComponent(prompt)}`}
            />
            <DefaultActions searchResult={searchResult} />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              title="Copy Summary To Clipboard"
              content={data}
            />
            {code?.[1] ? (
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy Snippet To Clipboard"
                content={code[1].replace(/`{3}/g, "")}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface SearchResult {
  name: string;
  description: string;
  type: string;
  url: string;
}
