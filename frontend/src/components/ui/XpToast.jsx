import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearNewNotifications } from "../../store/slices/gamificationSlice";

/**
 * Floating XP + badge notification that auto-dismisses.
 * Mount once in MainLayout.
 */
function XpToast() {
  const dispatch = useDispatch();
  const { newBadges, newXp } = useSelector(s => s.gamification);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (newXp > 0 || newBadges.length > 0) {
      const toShow = [];
      if (newXp > 0) toShow.push({ type: "xp", xp: newXp });
      for (const b of newBadges) toShow.push({ type: "badge", badge: b });
      setItems(toShow);
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        dispatch(clearNewNotifications());
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [newXp, newBadges.length]);

  if (!visible || items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-xl animate-slide-up"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          {item.type === "xp" ? (
            <>
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-sm font-bold text-yellow-400">+{item.xp} XP</p>
                <p className="text-xs text-gray-300">Keep going!</p>
              </div>
            </>
          ) : (
            <>
              <span className="text-2xl">{item.badge.icon}</span>
              <div>
                <p className="text-sm font-bold text-indigo-300">Badge Unlocked!</p>
                <p className="text-xs text-gray-200">{item.badge.name}</p>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default XpToast;
