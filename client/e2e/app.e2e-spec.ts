import { BnbClientPage } from './app.po';

describe('bnb-client App', () => {
  let page: BnbClientPage;

  beforeEach(() => {
    page = new BnbClientPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
