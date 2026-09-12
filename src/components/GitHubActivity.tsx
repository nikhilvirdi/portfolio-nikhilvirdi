import { useState } from 'react';
import { GitHubCalendar } from 'react-github-calendar';
import 'react-github-calendar/tooltips.css';

const CALENDAR_THEME = {
  light: ['#161618', '#0e4429', '#006d32', '#26a641', '#39d353'],
  dark: ['#161618', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

export default function GitHubActivity() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="w-full mt-8">
      {loading && (
        <p className="font-tag text-sm text-muted animate-pulse py-2">
          Loading...
        </p>
      )}

      <div
        className={`w-full transition-opacity duration-300 ${
          loading ? 'opacity-0 h-0 pointer-events-none' : 'opacity-100 h-auto'
        }`}
      >
        <div className="w-full font-tag text-muted text-xs [&_text]:fill-muted [&_text]:font-tag [&_.react-activity-calendar__count]:text-muted [&_.react-activity-calendar__count]:font-tag [&_.react-activity-calendar__legend-colors]:text-muted [&_.react-activity-calendar__legend-colors]:font-tag [&_.react-activity-calendar__footer]:font-tag [&_.react-activity-calendar__footer]:text-xs [&_a]:hidden">
          <GitHubCalendar
            username="nikhilvirdi"
            year={2026}
            colorScheme="dark"
            theme={CALENDAR_THEME}
            blockMargin={4}
            blockRadius={2}
            fontSize={12}
            style={{ width: '100%' }}
            tooltips={{
              activity: {
                text: (activity) =>
                  `${activity.count} contribution${activity.count === 1 ? '' : 's'} on ${activity.date}`,
              },
            }}
            labels={{
              totalCount: '{{count}} contributions in {{year}}',
            }}
            transformData={(data) => {
              if (loading) {
                setTimeout(() => setLoading(false), 0);
              }
              return data;
            }}
          />
        </div>
      </div>
    </div>
  );
}
