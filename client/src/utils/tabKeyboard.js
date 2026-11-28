export function handleTabListKeyDown(event) {
    const tabList = event.currentTarget.closest('[role="tablist"]');
    if (!tabList)
        return;
    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(event.currentTarget);
    if (currentIndex < 0)
        return;
    const nextIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
            : event.key === 'ArrowRight' ? (currentIndex + 1) % tabs.length
                : event.key === 'ArrowLeft' ? (currentIndex - 1 + tabs.length) % tabs.length
                    : currentIndex;
    if (nextIndex !== currentIndex) {
        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
    }
}
