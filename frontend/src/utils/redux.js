// src/utils/reduxKV.js
import { store } from "store"; // <-- было: import store from "store"
import { setKV, clearKV, selectKV } from "store/kvSlice";
import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { toSerializable } from "utils/serialize";

export function setRedux(name, value) {
  store.dispatch(setKV({ name, value: toSerializable(value) }));
}

export function getRedux(name, defaultValue) {
  return selectKV(store.getState(), name, defaultValue);
}

export function delRedux(name) {
  store.dispatch(clearKV({ name }));
}

export function subscribeRedux(name, callback) {
  let last = getRedux(name);
  return store.subscribe(() => {
    const current = getRedux(name);
    if (current !== last) {
      last = current;
      callback(current);
    }
  });
}

export function useRedux(name, defaultValue) {
  const dispatch = useDispatch();
  const value = useSelector((state) => selectKV(state, name, defaultValue));
  const setValue = useCallback(
    (v) => dispatch(setKV({ name, value: toSerializable(v) })),
    [dispatch, name]
  );
  return [value, setValue];
}
