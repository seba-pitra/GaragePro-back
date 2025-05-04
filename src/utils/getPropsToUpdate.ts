export function getPropsToUpdate(object: { [key: string]: any }) {
  const propsToUpdate = {} as any;

  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) {
      let newKey = key;

      for (const character of key) {
        if (character === character.toUpperCase()) {
          newKey = newKey.replace(character, '_' + character.toLowerCase());
        }
      }

      propsToUpdate[newKey] = value;
    }
  }

  return propsToUpdate;
}
