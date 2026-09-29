import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PublicFootprints, PublicTimeline } from '../public-api/types';
import { getFootprintsValidationError, getTimelineValidationError } from './content-validation';

test('timeline validation requires company and start date for every entry', () => {
  const timeline: PublicTimeline = {
    version: 1,
    items: [
      {
        id: 'internship-1',
        company: '',
        position: '',
        description: '',
        icon: '',
        iconColor: '',
        startDate: '',
        endDate: '',
        isPresent: false,
        sortOrder: 0,
      },
    ],
  };
  assert.equal(getTimelineValidationError(timeline), '请为每条经历填写公司和开始日期。');
});

test('footprints validation rejects stays linked to missing locations', () => {
  const footprints: PublicFootprints = {
    version: 1,
    locations: [],
    stays: [
      {
        id: 'stay-1',
        locationId: 'missing',
        title: '停留',
        type: '',
        description: '',
        startDate: '2026.01',
        endDate: '',
        isPresent: false,
        sortOrder: 0,
      },
    ],
    routes: [],
  };
  assert.equal(getFootprintsValidationError(footprints), '每条停留记录都需要标题、开始日期和有效的所属地点。');
});

test('empty personal content is valid', () => {
  assert.equal(getTimelineValidationError({ version: 1, items: [] }), null);
  assert.equal(getFootprintsValidationError({ version: 1, locations: [], stays: [], routes: [] }), null);
});
