from schematics.models import Model
from schematics.types import ModelType, ListType, StringType

from .operation import TypeSpecOperation


class TypeSpecPathItem(Model):
    """Describes a single API operation on a path."""
    
    get = ModelType(TypeSpecOperation)  # A definition of a GET operation on this path.
    post = ModelType(TypeSpecOperation)  # A definition of a POST operation on this path.
    put = ModelType(TypeSpecOperation)  # A definition of a PUT operation on this path.
    patch = ModelType(TypeSpecOperation)  # A definition of a PATCH operation on this path.
    delete = ModelType(TypeSpecOperation)  # A definition of a DELETE operation on this path.
    head = ModelType(TypeSpecOperation)  # A definition of a HEAD operation on this path.

    traces = ListType(StringType())  # traces of the path item
