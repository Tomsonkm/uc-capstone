export function Brand({variant='light'}:{variant?:'light'|'dark'}) {
  return <img className="brand" src={`/brand/uc-logo-${variant==='dark'?'white':'night'}.png`} width="200" height="54" alt="University of Canberra" />;
}
