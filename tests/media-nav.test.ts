import { describe, expect, it } from 'vitest';
import { classify, cleanTitle, parseEpisode } from '../src/shared/media';
import { moveFocus, scrollToShow } from '../src/shared/nav';
import { describeWeather, greeting, moodFor } from '../src/shared/weather';

describe('library files', () => {
  it('reads episodes in the usual forms', () => {
    expect(parseEpisode('The.Office.S02E05.720p.mkv')).toEqual({ show: 'The Office', season: 2, episode: 5 });
    expect(parseEpisode('Dark - s1e10.mp4')).toEqual({ show: 'Dark', season: 1, episode: 10 });
    expect(parseEpisode('Friends 3x07.avi')).toEqual({ show: 'Friends', season: 3, episode: 7 });
    expect(parseEpisode('Inception.2010.mkv')).toBeNull();
  });

  it('cleans movie titles and finds the year', () => {
    expect(cleanTitle('Blade.Runner.2049.2017.2160p.BluRay.x265.mkv')).toEqual({ title: 'Blade Runner 2049', year: 2017 });
    expect(cleanTitle('Inception (2010).mp4')).toEqual({ title: 'Inception', year: 2010 });
    expect(cleanTitle('home video.mov')).toEqual({ title: 'home video', year: null });
  });

  it('sorts files by the folder kind, and skips samples and other files', () => {
    expect(classify('a.mkv', 'movies')).toBe('movies');
    expect(classify('Show.S01E01.mkv', 'movies')).toBe('shows');
    expect(classify('a.flac', 'music')).toBe('music');
    expect(classify('a.flac', 'movies')).toBeNull();
    expect(classify('a.jpg', 'photos')).toBe('photos');
    expect(classify('movie-sample.mkv', 'movies')).toBeNull();
    expect(classify('notes.txt', 'movies')).toBeNull();
  });
});

describe('remote navigation', () => {
  const rows = [{ centers: [100, 300, 500] }, { centers: [] }, { centers: [80, 260, 440, 620, 800] }];

  it('moves within a row and stops at its ends', () => {
    expect(moveFocus(rows, { row: 0, col: 1 }, 'right')).toEqual({ row: 0, col: 2 });
    expect(moveFocus(rows, { row: 0, col: 2 }, 'right')).toBeNull();
    expect(moveFocus(rows, { row: 0, col: 0 }, 'left')).toBeNull();
  });

  it('skips empty rows and lands on the nearest item', () => {
    expect(moveFocus(rows, { row: 0, col: 2 }, 'down')).toEqual({ row: 2, col: 2 });
    expect(moveFocus(rows, { row: 2, col: 4 }, 'up')).toEqual({ row: 0, col: 2 });
    expect(moveFocus(rows, { row: 0, col: 0 }, 'up')).toBeNull();
  });

  it('scrolls only when the item would leave the view', () => {
    expect(scrollToShow(0, 1000, 400, 200, 50)).toBe(0);
    expect(scrollToShow(0, 1000, 900, 200, 50)).toBe(150);
    expect(scrollToShow(500, 1000, 300, 200, 50)).toBe(250);
  });
});

describe('weather words', () => {
  it('names WMO codes and picks a mood', () => {
    expect(describeWeather(0).text).toBe('Clear');
    expect(describeWeather(63).mood).toBe('rain');
    expect(describeWeather(95).mood).toBe('storm');
    expect(moodFor(0, false, 12)).toBe('night');
    expect(moodFor(null, null, 23)).toBe('night');
    expect(greeting(20)).toBe('Good evening');
  });
});
