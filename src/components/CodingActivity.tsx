import { useState, useEffect } from 'react';
import { ActivityCalendar, type Activity } from 'react-activity-calendar';

const CALENDAR_THEME = {
  light: ['#161618', '#0e4429', '#006d32', '#26a641', '#39d353'],
  dark: ['#161618', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

export default function CodingActivity() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<Activity[]>([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    async function fetchCalendar() {
      try {
        const [res2025, res2026] = await Promise.all([
          fetch('https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2025', {
            signal: controller.signal,
          }),
          fetch('https://alfa-leetcode-api.onrender.com/nikhilvirdi/calendar?year=2026', {
            signal: controller.signal,
          }),
        ]);
        clearTimeout(timeoutId);

        if (!res2025.ok || !res2026.ok) {
          throw new Error(`HTTP error: 2025=${res2025.status}, 2026=${res2026.status}`);
        }

        const [json2025, json2026] = await Promise.all([res2025.json(), res2026.json()]);

        function parseSubCalendar(raw: unknown): Record<string, number> {
          if (typeof raw === 'string') {
            try {
              return JSON.parse(raw);
            } catch {
              return {};
            }
          } else if (raw && typeof raw === 'object') {
            return raw as Record<string, number>;
          }
          return {};
        }

        const sub2025 = parseSubCalendar(json2025.submissionCalendar);
        const sub2026 = parseSubCalendar(json2026.submissionCalendar);

        const dateCounts: Record<string, number> = {};
        for (const sub of [sub2025, sub2026]) {
          for (const [tsStr, count] of Object.entries(sub)) {
            const ts = Number(tsStr);
            if (!isNaN(ts)) {
              const d = new Date(ts < 1e11 ? ts * 1000 : ts);
              const dateKey = d.toISOString().slice(0, 10);
              dateCounts[dateKey] = (dateCounts[dateKey] || 0) + Number(count);
            }
          }
        }

        // Filter down to only dates from July 1, 2025 through July 1, 2026 inclusive
        const activities: Activity[] = [];
        const curDate = new Date(Date.UTC(2025, 6, 1));
        const endDate = new Date(Date.UTC(2026, 6, 1));

        while (curDate <= endDate) {
          const dateStr = curDate.toISOString().slice(0, 10);
          const count = dateCounts[dateStr] || 0;
          let level = 0;
          if (count > 0) {
            if (count <= 2) level = 1;
            else if (count <= 5) level = 2;
            else if (count <= 9) level = 3;
            else level = 4;
          }
          activities.push({
            date: dateStr,
            count,
            level,
          });
          curDate.setUTCDate(curDate.getUTCDate() + 1);
        }

        if (isMounted) {
          setData(activities);
          setLoading(false);
        }
      } catch (err) {
        console.error('LeetCode calendar fetch error:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchCalendar();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return (
    <div className="w-full mt-8">
      {loading && (
        <p className="font-tag text-sm text-muted animate-pulse py-2">
          Loading...
        </p>
      )}

      {error && (
        <p className="font-tag text-sm text-muted py-2">
          LeetCode activity temporarily unavailable (
          <a
            href="https://leetcode.com/u/nikhilvirdi/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            https://leetcode.com/u/nikhilvirdi/
          </a>
          )
        </p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="w-full transition-opacity duration-300 opacity-100 h-auto">
          <div className="w-full font-tag text-muted text-xs [&_text]:fill-muted [&_text]:font-tag [&_.react-activity-calendar__count]:text-muted [&_.react-activity-calendar__count]:font-tag [&_.react-activity-calendar__legend-colors]:text-muted [&_.react-activity-calendar__legend-colors]:font-tag [&_.react-activity-calendar__footer]:font-tag [&_.react-activity-calendar__footer]:text-xs [&_a]:hidden">
            <ActivityCalendar
              data={data}
              colorScheme="dark"
              theme={CALENDAR_THEME}
              blockMargin={4}
              blockRadius={2}
              fontSize={12}
              style={{ width: '100%' }}
              tooltips={{
                activity: {
                  text: (activity) =>
                    `${activity.count} submission${activity.count === 1 ? '' : 's'} on ${activity.date}`,
                },
              }}
              labels={{
                totalCount: '{{count}} submissions (Jul 2025 – Jul 2026)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
