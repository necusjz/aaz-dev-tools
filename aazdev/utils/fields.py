from schematics.types import StringType
from aazdev.utils.plane import PlaneEnum


class PlaneField(StringType):

    def __init__(self, *args, **kwargs):
        super(PlaneField, self).__init__(
            choices=PlaneEnum.choices(),
            *args, **kwargs
        )


__all__ = ["PlaneField"]
