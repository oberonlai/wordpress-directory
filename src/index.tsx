import { useState } from "react";
import { useAI, useFetch, } from "@raycast/utils";
import { ActionPanel, Action, List, Icon, environment, AI, Detail } from "@raycast/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch(`https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[per_page]=100&request[search]=${searchText}`, {
    execute: searchText.length > 0,
	parseResponse: parseFetchResponse,
  });

 console.log(data);
 
  

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search WordPress plugins..."
	  {...(searchText.length > 0 ? {isShowingDetail: true} : {})}

      throttle
    >
      {searchText.length > 0 ? (
        <List.Section  title="Results" subtitle={data?.length + ""}>
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
    description: plugin.description.replace(/<[^>]+>/g, '\n'),
	url: `https://wordpress.org/plugins/${plugin.slug}/`,
	icon: plugin.icons['1x'],
	download: plugin.download_link,
	version: plugin.version,
	rating: Math.ceil((plugin.ratings['1']/plugin.num_ratings)*100),
	solved: Math.ceil((plugin.support_threads_resolved/plugin.support_threads)*100),
	downloaded: plugin.downloaded.toLocaleString(),
	update:plugin.last_updated
  } as SearchResult));
  return parsedData;
}

function defaultLinks() {
  return [
    {
      name: "Go to Plugins Directory",
      description: "Looking for plugins for the WordPress?",
      url: "https://wordpress.org/plugins/",
	  icon:Icon.Hammer,
    } as SearchResult,
    {
      name: "Go to Themes Directory",
      description: "Looking for themes for the WordPress?",
      url: "https://wordpress.org/themes/",
	  icon:Icon.Brush,
    } as SearchResult,
	{
		name: "Go to Patterns Directory",
		description: "Looking for patterns for the WordPress?",
		url: "https://wordpress.org/patterns/",
		icon:Icon.PlusTopRightSquare,
	  } as SearchResult,
  ];
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult?.name}
	  icon={searchResult?.icon}
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
	  detail={
		<List.Item.Detail
		  markdown={searchResult?.description}
		  metadata={
			<List.Item.Detail.Metadata>
				<List.Item.Detail.Metadata.Link
			    title="Download Zip"
			    target={searchResult?.download || '#'}
			    text="Download from WordPress.org"
			  />
				<List.Item.Detail.Metadata.Label title="Version" text={searchResult?.version} />
			  <List.Item.Detail.Metadata.Label title="1 Star ratio" text={searchResult?.rating+'%' || 'loading...'} />
			  <List.Item.Detail.Metadata.Label title="Problem-solving ratio" text={searchResult?.solved+'%' || 'loading...'} />
			  <List.Item.Detail.Metadata.Label title="Downloaded" text={searchResult?.downloaded || 'loading...'} />
			  <List.Item.Detail.Metadata.Label title="Last Updated" text={searchResult?.update || 'loading...'} />
			</List.Item.Detail.Metadata>
		  }
		/>
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
  icon: string;
  download: string;
  version: string;
  rating: number;
  solved: number;
  downloaded: string;
  update: string;
}
