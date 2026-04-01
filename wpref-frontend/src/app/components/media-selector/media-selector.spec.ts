import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MediaSelectorComponent} from './media-selector';

describe('MediaSelectorComponent', () => {
  let component: MediaSelectorComponent;
  let fixture: ComponentFixture<MediaSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('classifies image and video files for the frontend form value', () => {
    const imageFile = new File(['img'], 'image.png', {type: 'image/png'});
    const videoFile = new File(['vid'], 'video.mp4', {type: 'video/mp4'});

    component.onFilesSelected({files: [imageFile, videoFile]});

    expect(component.items).toEqual([
      {
        kind: 'image',
        file: imageFile,
        external_url: null,
        sort_order: 1,
      },
      {
        kind: 'video',
        file: videoFile,
        external_url: null,
        sort_order: 2,
      },
    ]);
  });

  it('adds a youtube link as an external media entry', () => {
    const youtubeUrl = 'https://youtu.be/dQw4w9WgXcQ?t=43';

    component.youtubeUrl.set(youtubeUrl);
    component.addYoutubeLink();

    expect(component.items).toEqual([
      {
        kind: 'external',
        file: null,
        external_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        sort_order: 1,
      },
    ]);
  });

  it('rejects a non youtube external url', () => {
    component.youtubeUrl.set('https://example.com/video');
    component.addYoutubeLink();

    expect(component.items).toEqual([]);
    expect(component.youtubeError()).toBe('Le lien doit être une URL YouTube valide.');
  });
});
