type AnimationFunction = () => void;

export function AnimationHandler(animations: AnimationFunction[]) {
  return (isEnabled: boolean): void => {
    if (isEnabled === false) {
      try {
        animations.forEach((animation: AnimationFunction) => {
          try {
            animation();
          } catch (error) {
            console.error(` Error running animation ${animation.name}:`, error);
          }
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(' Error running animations:', errorMessage);
      }
    } else {
      if (import.meta.env.DEV) {
        console.info('Animations turned off');
      }
    }
  };
}
