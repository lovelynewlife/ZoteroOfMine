/**
 * Mock History Data for Testing
 * Provides test data to verify time-based deletion functionality
 */

import { ItemInfo } from "./zdb";
import { NewHistoryEntry, ReadingHistoryEntry } from "../modules/historyStore";

export interface MockHistoryData {
  entries: NewHistoryEntry[];
  timeOffsets: number[];
}

/**
 * Generate mock history data for testing
 * Creates entries with different time ranges to test time-based deletion
 */
export function generateMockHistoryData(): MockHistoryData {
  const mockEntries: NewHistoryEntry[] = [
    {
      item: {
        id: 99901,
        title: "Test Paper - Recent (Last Hour)",
        authors: "Author A, Author B",
        year: "2024",
        publication: "Journal of Testing",
        doi: "10.1234/test.001",
        abstract: "A test paper for recent deletion testing",
      },
    },
    {
      item: {
        id: 99902,
        title: "Test Paper - Last Day",
        authors: "Author C, Author D",
        year: "2024",
        publication: "Journal of Testing",
        doi: "10.1234/test.002",
        abstract: "A test paper from yesterday",
      },
    },
    {
      item: {
        id: 99903,
        title: "Test Paper - Last Week",
        authors: "Author E, Author F",
        year: "2024",
        publication: "Journal of Testing",
        doi: "10.1234/test.003",
        abstract: "A test paper from last week",
      },
    },
    {
      item: {
        id: 99904,
        title: "Test Paper - Last Month",
        authors: "Author G, Author H",
        year: "2024",
        publication: "Journal of Testing",
        doi: "10.1234/test.004",
        abstract: "A test paper from last month",
      },
    },
    {
      item: {
        id: 99905,
        title: "Test Paper - Last 3 Months",
        authors: "Author I, Author J",
        year: "2024",
        publication: "Journal of Testing",
        doi: "10.1234/test.005",
        abstract: "A test paper from 3 months ago",
      },
    },
    {
      item: {
        id: 99906,
        title: "Test Paper - Last 6 Months",
        authors: "Author K, Author L",
        year: "2024",
        publication: "Journal of Testing",
        doi: "10.1234/test.006",
        abstract: "A test paper from 6 months ago",
      },
    },
    {
      item: {
        id: 99907,
        title: "Test Paper - Last Year",
        authors: "Author M, Author N",
        year: "2023",
        publication: "Journal of Testing",
        doi: "10.1234/test.007",
        abstract: "A test paper from last year",
      },
    },
    {
      item: {
        id: 99908,
        title: "Test Paper - Old (2 Years)",
        authors: "Author O, Author P",
        year: "2022",
        publication: "Journal of Testing",
        doi: "10.1234/test.008",
        abstract: "A test paper from 2 years ago",
      },
    },
  ];

  // Time offsets from now for each entry
  const timeOffsets = [
    0,                        // Now (Last Hour)
    12 * 60 * 60 * 1000,      // 12 hours ago (Last Day)
    3 * 24 * 60 * 60 * 1000,  // 3 days ago (Last Week)
    20 * 24 * 60 * 60 * 1000, // 20 days ago (Last Month)
    80 * 24 * 60 * 60 * 1000, // 80 days ago (Last 3 Months)
    170 * 24 * 60 * 60 * 1000,// 170 days ago (Last 6 Months)
    350 * 24 * 60 * 60 * 1000,// 350 days ago (Last Year)
    730 * 24 * 60 * 60 * 1000,// 730 days ago (2 Years)
  ];

  return { entries: mockEntries, timeOffsets };
}

/**
 * Get mock item IDs for cleanup
 */
export function getMockItemIDs(): number[] {
  return Array.from({ length: 8 }, (_, i) => 99901 + i);
}
