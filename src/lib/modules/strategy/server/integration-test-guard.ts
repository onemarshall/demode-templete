/** Only the disposable integration host may load deterministic provider ports. */
export function assertLocalStrategyIntegration() {
 if(process.env.NODE_ENV!=='development'||process.env.STRATEGY_INTEGRATION_TEST_MODE!=='1')
  throw new Error('Strategy integration fixture requires explicit development opt-in');
 const url=new URL(process.env.BETTER_DATABASE_URL??'');
 if(!['localhost','127.0.0.1','[::1]','::1'].includes(url.hostname)||decodeURIComponent(url.pathname)!=='/strategy_auth_integration_test')
  throw new Error('Strategy integration fixture requires its exact disposable local database');
 const origin=new URL(process.env.PUBLIC_SITE_URL??'');
 if(!['localhost','127.0.0.1','[::1]','::1'].includes(origin.hostname))
  throw new Error('Strategy integration fixture requires a loopback application origin');
}
