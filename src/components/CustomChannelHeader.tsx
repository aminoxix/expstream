import { ArrowRightIcon } from "@phosphor-icons/react";

export default function CustomChannelHeader({
  setChatExpanded,
}: {
  setChatExpanded?: (expanded: boolean) => void;
}) {
  return (
    <div className="text-sm text-gray-500 flex items-center p-4">
      {setChatExpanded && (
        <button
          className="text-sm text-gray-500 rotate-180 transition-transform duration-150 ease-in-out"
          onClick={() => setChatExpanded(false)}
        >
          <ArrowRightIcon />
        </button>
      )}
      <h2 className="text-black mx-auto font-bold">HOAshare Chat</h2>
    </div>
  );
}
