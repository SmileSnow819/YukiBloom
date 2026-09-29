import FriendCard from '@components/friends/FriendCard';

interface Props {
  gridElement: HTMLElement;
}

export function FriendLinksGrid({ gridElement }: Props) {
  let raw: Record<string, string | undefined>[];
  try {
    const parsed = JSON.parse(gridElement.dataset.links || '[]');
    raw = Array.isArray(parsed) ? parsed : [];
  } catch {
    raw = [];
  }
  const friends = raw.map((item) => ({
    site: item.site || '',
    url: item.url || '',
    owner: item.owner || item.site || '',
    description: item.desc || '',
    image: item.image || '',
    color: item.color,
  }));

  return (
    <div className="not-prose grid grid-cols-2 gap-4 sm:grid-cols-3">
      {friends.map((friend, index) => (
        <FriendCard key={friend.url} friend={friend} index={index} />
      ))}
    </div>
  );
}
