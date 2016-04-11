"use strict"; /* global chrome */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>
{
	switch(request.action)
	{
		case 'close-current-tab':
			chrome.tabs.query({ active: true, currentWindow: true },
				tabs =>	{ chrome.tabs.remove(tabs[0].id); });
			break;

		case 'reopen-closed-tab':
			const url = tabs.get(closedTabs.pop());
			if(url)
				chrome.tabs.create({ url });
			break;
	}
});

const tabs = new Map();
let closedTabs = [];
const MAX_HISTORY = 10;

chrome.tabs.onRemoved.addListener((tabId, info) =>
	{
		if(tabs.has(tabId))
		{
			// collect closed tabs IDs
			closedTabs.push(tabId);
			closedTabs = closedTabs.slice(closed.length - MAX_HISTORY);
		}
	});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) =>
	{
		// save tabId <=> url relations
		tabs.set(tabId, tab.url);
	});