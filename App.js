import React, {useRef, useMemo, useState, useCallback, useEffect} from 'react';
import {View, StyleSheet, Dimensions, Text} from 'react-native';
import {
  PanGestureHandler,
  State,
  NativeViewGestureHandler,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Animated, {Easing} from 'react-native-reanimated';

const {cond, eq, block, set, add, timing, SpringUtils} = Animated;

const window = Dimensions.get('window');

function useAnimatedEvent(nativeEvent: any) {
  return useMemo(
    () =>
      Animated.event(
        [
          {
            nativeEvent,
          },
        ],
        {useNativeDriver: true},
      ),
    [nativeEvent],
  );
}

function useAnimatedValue(
  value: number,
  useListener?: boolean,
  debugLabel?: string,
) {
  const lastValue = useRef(null);

  const animatedValue = useMemo(() => new Animated.Value(value), [value]);

  useEffect(() => {
    if (!useListener) {
      return;
    }

    const animatedAlways = Animated.always(
      Animated.call([animatedValue], ([val]) => {
        lastValue.current = val;

        if (debugLabel) {
          console.log(debugLabel, val);
        }
      }),
    );
    animatedAlways.__attach();

    // return undo function
    return () => animatedAlways.__detach();
  }, [animatedValue, debugLabel, useListener]);

  animatedValue.getValue = () => lastValue.current;

  return animatedValue;
}

const s = StyleSheet.create({
  root: {
    paddingTop: 20,
    flex: 1,
  },
  scrollContent: {
    // flexDirection: 'row',
    // flexWrap: 'wrap',
  },

  box: {
    height: 150,
    width: window.width / 2,
    backgroundColor: 'red',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

const items = Array.from({length: 16}, (_, index) => index);

function useSpring(value: Animated.Value, config: {toValue: number}) {
  return useMemo(() => {
    return Animated.spring(value, {
      tension: 90,
      friction: 30,
      ...config,
      // useNativeDriver: true,
    });
  }, [config, value]);
}

// function useTiming(
//   value: Animated.Value,
//   config: { toValue: number },
// ) {
//   return useMemo(() => {
//     return Animated.timing(value, {
//       // tension: 90,
//       // friction: 30,
//       ...config,
//       // useNativeDriver: true,
//     });
//   }, []);
// }

const REFRESH_HEIGHT = 120;

const App = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const panY = useAnimatedValue(0, true, 'Pan');
  const marginTop = useAnimatedValue(0, true, 'Margin');
  const scrollY = useAnimatedValue(0, true, 'Scroll');
  const gestureState = useAnimatedValue(-1, true);

  // const _transX = useAnimatedValue(0, true, 'TransX');

  const onGestureEvent = useAnimatedEvent({
    state: gestureState,
    translationY: panY,
  });
  const onScrollEvent = useAnimatedEvent({
    contentOffset: {y: scrollY},
  });

  const marginTopWithOffset = cond(
    eq(gestureState, State.END),
    block([set(marginTop, add(marginTop, panY)), marginTop]),
    add(marginTop, panY),
  );

  // const refreshEndAnimation = useTiming(panY, {
  //   toValue: 0,
  // });
  // // const refreshEndAnimation = useSpring(panY, {
  // //   toValue: 0,
  // // });
  // const refreshAnimation = useSpring(panY, {
  //   toValue: REFRESH_HEIGHT,
  // });

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.state === State.END) {
        const q2 = marginTop.getValue();
        if (+scrollY.getValue() - +panY.getValue() <= 0) {
          // if (scrollY.getValue() <= 0) {
          const panValue = panY.getValue();

          if (panValue >= REFRESH_HEIGHT) {
            setIsRefreshing(true);

            Animated.timing(panY, {
              tension: 90,
              friction: 30,
              toValue: REFRESH_HEIGHT,
              duration: 100,
              easing: Easing.inOut(Easing.ease),
            }).start(i => {
              // if(panValue !== panY.getValue()){
              //   return
              // }
              setTimeout(() => {
                setIsRefreshing(false);
                const st = panY.getValue();
                const sq = scrollY.getValue();

                if (REFRESH_HEIGHT - scrollY.getValue() >= 0) {
                  Animated.timing(panY, {
                    tension: 90,
                    friction: 30,
                    toValue: 0,
                    duration: 100,
                    easing: Easing.inOut(Easing.ease),
                  }).start(i => {});
                } else {
                  // scrollY.setValue(0);
                }
              }, 4000);
            });
            // setIsRefreshing(true);
            // refreshAnimation.start(() => {
            //   // do request here
            //   setTimeout(() => {
            //     // call after request
            //     setIsRefreshing(false);
            //     refreshEndAnimation.start();
            //   }, 1000);
            // });
          } else {
            Animated.timing(panY, {
              tension: 90,
              friction: 30,
              toValue: 0,
              duration: 100,
              easing: Easing.inOut(Easing.ease),
            }).start(i => {
              scrollY.setValue(0);
            });
          }
        }
      }
    },
    [marginTop, panY, scrollY],
  );

  return (
    <PanGestureHandler
      id="pan"
      enabled={!isRefreshing}
      onGestureEvent={onGestureEvent}
      simultaneousHandlers={['scroll']}
      onHandlerStateChange={onHandlerStateChange}>
      <Animated.View style={[s.root]}>
        <NativeViewGestureHandler id="scroll" simultaneousHandlers={['pan']}>
          <Animated.ScrollView bounces={false} onScroll={onScrollEvent}>
            <Animated.View
              style={[
                {
                  paddingTop: marginTopWithOffset,
                },
              ]}>
              {items.map((item, index) => (
                <View style={s.box} key={item}>
                  <Text>{index}</Text>
                </View>
              ))}
            </Animated.View>
          </Animated.ScrollView>
        </NativeViewGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default App;
